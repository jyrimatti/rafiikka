{-# LANGUAGE ScopedTypeVariables #-}
module Browser.Events where
  
import JSDOM.Types (EventListener (EventListener), IsEventTarget, IsEvent)
import Language.Javascript.JSaddle (JSM, ToJSVal (toJSVal), ToJSString)
import Universum (($), Functor (fmap), Maybe (Just), Bool (False))
import FFI (function1)
import qualified JSDOM.Generated.EventTarget as EL


addEventListener :: (IsEvent event, IsEventTarget et, ToJSString name) => et -> name -> (event -> JSM ()) -> JSM ()
addEventListener elem event listener = do
    l <- fmap EventListener $ toJSVal $ function1 listener
    EL.addEventListener elem event (Just l) False